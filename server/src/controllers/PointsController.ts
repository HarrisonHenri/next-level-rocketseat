import { Request, Response } from 'express'
import knex from '../database/connection'

class PointsController {
  async index(req: Request, res: Response): Promise<Response> {
    const { city, uf, items } = req.query

    const parsedItems = String(items)
      .split(',')
      .map(item => Number(item.trim()))

    const points = await knex('points')
      .join('point_items', 'points.id', '=', 'point_items.pointId')
      .whereIn('point_items.itemId', parsedItems)
      .where('city', String(city))
      .where('uf', String(uf))
      .distinct()
      .select('points.*')

    const serializedPoints = points.map(point => {
      return {
        ...point,
        image_url: `http://192.168.0.4:3333/uploads/${point.image}`,
      }
    })

    return res.json(serializedPoints)
  }

  async show(req: Request, res: Response): Promise<Response> {
    const { id } = req.params

    const point = await knex('points').where('id', id).first()

    if (!point) {
      return res.status(400).json({ message: 'Point not found' })
    }

    const serializedPoint = {
      ...point,
      image_url: `http://192.168.0.4:3333/uploads/${point.image}`,
    }

    const items = await knex('items')
      .join('point_items', 'items.id', '=', 'point_items.itemId')
      .where('point_items.pointId', id)
      .select('items.title')

    return res.json({ serializedPoint, items })
  }

  async create(req: Request, res: Response): Promise<Response> {
    const {
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      city,
      uf,
      items,
    } = req.body

    const trx = await knex.transaction()

    const point = {
      image: req.file.filename,
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      city,
      uf,
    }

    const insertedIds = await trx('points').insert(point)

    const pointId = insertedIds[0]

    const pointItems = items
      .split(',')
      .map((itemId: string) => Number(itemId.trim()))
      .map((itemId: number) => {
        return {
          itemId,
          pointId,
        }
      })

    await trx('point_items').insert(pointItems)

    await trx.commit()

    return res.json({ id: pointId, ...point })
  }
}

export default new PointsController()
